module CampusSolutions
  class AddressController < CampusSolutionsController
    rescue_from Errors::ClientError, with: :handle_client_error

    before_filter :exclude_acting_as_users

    def post
      post_passthrough CampusSolutions::MyAddress
    end

    def delete
      delete_passthrough CampusSolutions::MyAddress
    end

  end
end
